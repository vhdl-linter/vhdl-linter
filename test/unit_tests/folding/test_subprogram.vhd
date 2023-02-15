library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

package pkg is
  function func return integer;
end package;

package body pkg is
  function func return integer is
  begin
    return 0;
  end function;
end package body;