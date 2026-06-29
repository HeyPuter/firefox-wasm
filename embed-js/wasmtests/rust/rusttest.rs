#![no_std]
use core::panic::PanicInfo;
#[panic_handler] fn panic(_: &PanicInfo) -> ! { loop {} }

#[no_mangle] pub extern "C" fn fib(n: u32) -> u64 {
    if n < 2 { n as u64 } else { fib(n-1) + fib(n-2) }
}
#[no_mangle] pub extern "C" fn sum_sq(n: u32) -> u64 {
    let mut s = 0u64; let mut i = 1u64;
    while i <= n as u64 { s += i*i; i += 1; } s
}
#[no_mangle] pub extern "C" fn collatz(mut n: u64) -> u32 {
    let mut c = 0u32; while n != 1 { n = if n & 1 == 1 { 3*n+1 } else { n/2 }; c += 1; } c
}
#[no_mangle] pub extern "C" fn sort_checksum(seed: u32, count: u32) -> u32 {
    let mut a = [0u32; 256];
    let n = (if count > 256 { 256 } else { count }) as usize;
    let mut x = seed;
    let mut i = 0usize;
    while i < n { x = x.wrapping_mul(1103515245).wrapping_add(12345); a[i] = x % 1000; i += 1; }
    let mut i = 0usize;
    while i < n { let mut j = 0usize; while j + 1 + i < n {
        if a[j] > a[j+1] { let t = a[j]; a[j] = a[j+1]; a[j+1] = t; } j += 1; } i += 1; }
    let mut acc = 0u32; let mut i = 0usize;
    while i < n { acc = acc.wrapping_add(a[i].wrapping_mul(i as u32 + 1)); i += 1; } acc
}
fn add(a:i32,b:i32)->i32{a.wrapping_add(b)}
fn sub(a:i32,b:i32)->i32{a.wrapping_sub(b)}
fn mul(a:i32,b:i32)->i32{a.wrapping_mul(b)}
#[no_mangle] pub extern "C" fn dispatch(op: u32, a: i32, b: i32) -> i32 {
    let f: fn(i32,i32)->i32 = match op { 0=>add, 1=>sub, _=>mul };
    f(a, b)
}
