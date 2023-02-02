library ieee;
use ieee.std_logic_1164.all;

package test_pkg2 is
  function func return boolean;
  function func return integer;
  function func(a : integer) return integer;
end package test_pkg2;
package body test_pkg2 is
  function func return boolean is
  begin
    return true;
  end function func;
  function func return integer is
  begin
    return 5;
  end function func;
end package body test_pkg2;
