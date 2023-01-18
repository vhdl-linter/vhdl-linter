library ieee;
use ieee.std_logic_1164.all;
package test_function_call is
end package;
package body test_function_call is
  function foo (signal C : in std_ulogic) return boolean is
  begin
    return C'last_event = 0 sec;        --sec and attributes correctly parsed?
  end function foo;
end package body;
