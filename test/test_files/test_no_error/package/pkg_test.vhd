library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

package pkg_test is
  signal s: integer;
  constant c: integer := 3;
  subtype t is integer range 0 to 10;
end package;
