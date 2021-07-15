/+ dub.sdl:
   name "hello"
 +/

void main() {
    import std.stdio, std.net.curl;
    writeln("Hello, World!");
    writeln("Latest dmd version: ",
        get("http://downloads.dlang.org/releases/LATEST"));
}
