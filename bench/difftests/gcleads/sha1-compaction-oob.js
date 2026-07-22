var acc=0;
for(var it=0;it<8000;it++){ var h=hex_sha1("hello world"); acc=(acc+h.length)|0; }
print("crmin="+acc);
