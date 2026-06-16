// Step 2 verification: a tiny standalone wasm program that does a non-blocking
// TCP HTTP GET via the emscripten socket layer. With -sPROXY_TO_PTHREAD, main()
// runs on a worker, so socket()/connect()/poll()/recv() are proxied to the runtime
// main thread -- exactly the path Gecko's socket thread takes. The WISP bridge
// (wisp-bridge.js, loaded as --pre-js) replaces the global WebSocket on the main
// thread with a WISP-stream shim, so this fetch actually flows over WISP.
#include <arpa/inet.h>
#include <fcntl.h>
#include <netinet/in.h>
#include <poll.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <unistd.h>

static int wait_for(int fd, short events, int timeout_ms) {
  struct pollfd pfd = {.fd = fd, .events = events, .revents = 0};
  int start = 0;
  for (int i = 0; i < timeout_ms / 20 + 1; i++) {
    int r = poll(&pfd, 1, 20);
    if (r > 0 && (pfd.revents & (events | POLLERR | POLLHUP))) return pfd.revents;
    usleep(20000);
  }
  return 0;
}

int main(int argc, char** argv) {
  const char* host = getenv("ORIGIN_HOST");
  const char* ports = getenv("ORIGIN_PORT");
  if (!host) host = "127.0.0.1";
  int port = ports ? atoi(ports) : 80;
  printf("socktest: fetching http://%s:%d/\n", host, port);
  fflush(stdout);

  int fd = socket(AF_INET, SOCK_STREAM, 0);
  if (fd < 0) { printf("SOCKTEST_FAIL socket()\n"); return 1; }
  fcntl(fd, F_SETFL, O_NONBLOCK);

  struct sockaddr_in sa;
  memset(&sa, 0, sizeof(sa));
  sa.sin_family = AF_INET;
  sa.sin_port = htons(port);
  if (inet_pton(AF_INET, host, &sa.sin_addr) != 1) { printf("SOCKTEST_FAIL inet_pton\n"); return 1; }

  int r = connect(fd, (struct sockaddr*)&sa, sizeof(sa));
  printf("socktest: connect() = %d (EINPROGRESS expected)\n", r);
  fflush(stdout);

  if (!(wait_for(fd, POLLOUT, 8000) & POLLOUT)) { printf("SOCKTEST_FAIL no POLLOUT\n"); return 1; }
  printf("socktest: socket writable\n"); fflush(stdout);

  char req[256];
  int n = snprintf(req, sizeof(req),
                   "GET / HTTP/1.1\r\nHost: %s:%d\r\nConnection: close\r\n\r\n", host, port);
  int sent = send(fd, req, n, 0);
  printf("socktest: send() = %d / %d\n", sent, n);
  fflush(stdout);

  char buf[4096];
  int total = 0, ok_body = 0, got_200 = 0;
  char acc[8192];
  acc[0] = 0;
  for (;;) {
    short rev = wait_for(fd, POLLIN, 8000);
    if (!(rev & (POLLIN | POLLHUP))) { printf("socktest: recv timeout\n"); break; }
    int got = recv(fd, buf, sizeof(buf) - 1, 0);
    if (got == 0) { printf("socktest: peer closed (EOF)\n"); break; }
    if (got < 0) { if (rev & POLLHUP) break; continue; }
    buf[got] = 0;
    total += got;
    if (total < (int)sizeof(acc) - 1) { strncat(acc, buf, got); }
  }
  close(fd);

  got_200 = strstr(acc, "200") != NULL;
  ok_body = strstr(acc, "WISP_OK") != NULL;
  printf("socktest: received %d bytes, 200=%d body=%d\n", total, got_200, ok_body);
  printf("socktest: head=%.48s\n", acc);
  if (total > 0 && got_200 && ok_body) {
    printf("SOCKTEST_OK fetched HTTP over WISP via emscripten sockets\n");
    return 0;
  }
  printf("SOCKTEST_FAIL\n");
  return 1;
}
