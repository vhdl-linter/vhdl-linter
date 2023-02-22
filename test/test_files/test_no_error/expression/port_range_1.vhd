library ieee;
use ieee.std_logic_1164.all;

package pkg_generic is
  generic (
    g: integer
  );
  constant c: integer := 2;
end package;

entity port_integer_range_complex is
  generic (
    package pkg is new work.pkg_generic generic map(<>)
  );
  port (
    i_i: in integer range 0 to pkg.c
  );
end entity;

