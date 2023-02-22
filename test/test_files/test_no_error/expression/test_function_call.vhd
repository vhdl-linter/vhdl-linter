package test_function_call is
end package;
package body test_function_call is
  function foo (a : integer; b : integer; c : integer; d : integer) return integer is
  begin
    return a + b + c + d;
  end function;
  function test return integer is
    variable i : integer; -- vhdl-linter-disable-line unused
    variable a, b, c, d : integer; -- vhdl-linter-disable-line unused
  begin
    i := foo(a, b, c, d); -- This sometimes makes problems with finding prefixes
  end function;
end package body;
