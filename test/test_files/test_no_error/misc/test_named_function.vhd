library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

package test_named_function is

end package;
package body test_named_function is
  function foo(a : integer) return integer is
  begin
    return a;
  end function foo;

  function bar(b : integer) return integer is
    variable c : integer;
  begin
    c := foo(a   => b);
    c := c;
    return foo(a => b);
  end function bar;

end package body;
