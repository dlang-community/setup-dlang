/+ dub.sdl:
   name "hello"
 +/

void main() {
    import std.stdio, std.net.curl;
    writeln("Hello, World!");
    writeln("Latest dmd version: ",
        get("https://downloads.dlang.org/releases/LATEST"));
}
