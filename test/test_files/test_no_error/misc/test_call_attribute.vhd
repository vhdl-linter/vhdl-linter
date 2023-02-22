library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;
package test_call_attribute is

end package;
package body test_call_attribute is
  procedure foo (bar : integer) is
  begin
  report integer'image(bar);
  end procedure;
------------------------------------------------------------
  procedure AddCross (dummy : std_ulogic_vector) is
  ------------------------------------------------------------
  begin
    foo(dummy'length);
  end procedure AddCross;
end package body;
