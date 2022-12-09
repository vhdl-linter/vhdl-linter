library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity test_simple_entity is

end entity;
architecture arch of test_simple_entity is

  signal a   : unsigned(1 downto 0);
  signal a_i : integer;
begin
  a    <= a;
  a_I  <= 5 + 7;
  a    <= 5 - a;
  a    <= (and a) & a;
  a    <= a nor a;
  a    <= a and a and a;
  a_i  <= a_i ** a_i;
  a_i  <= a_i ** (a_i / 2);
  a_i  <= a_i * abs a_i;
  a_i  <= - a_i;
  a_i  <= - a_i - a_i;
  a(0) <= '1' when a_i /= a_i else '0';
  a(0) <= '1' when ?? a(0)    else '0';
  a    <= ('0', '1');
  a    <= (0 => '0', 1 => '1');
  a    <= (0 => '0', others => '1');
  a    <= ("10");
  a_i  <= + ((((((a_i + 2))))));
  a    <= a sll 2 + 3 * 32;
  a    <= a(to_integer(a * 2) - 3 downto 0 * 3);
  a    <= to_unsigned(a_i, 2);
  a    <= unsigned(std_ulogic_vector(a));
  a(0) <= xnor a;
  a    <= unsigned'(1 => '0');
  a_i <= a'length;
end arch;
