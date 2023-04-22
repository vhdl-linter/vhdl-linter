library ieee;
use ieee.std_logic_1164.all;
package pkg is
  attribute xyz: string;
  constant x: xyz := (others => '0'); -- xyz is an attribute and should not be found here
end package;