library ieee;
use ieee.std_logic_1164.all;

package test_pkg2 is
  function func return boolean;
end package test_pkg2;
package body test_pkg2 is
  function func return boolean is
  begin
    return true;
  end function;
end package body test_pkg2;
