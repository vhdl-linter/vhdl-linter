library ieee;
use ieee.std_logic_1164.all;
package pkg is
  constant xyz: string := "apple";
  constant x: integer := xyz'xyz; -- the 'xyz should not be found because it is an attribute reference
end package; 