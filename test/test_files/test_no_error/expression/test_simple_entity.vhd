library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity test_simple_entity is

end entity;
architecture arch of test_simple_entity is

  signal a   : u_unsigned(1 downto 0);
  signal b   : u_unsigned(2 downto 0); -- vhdl-linter-disable-line unused
  signal a_i : integer;
begin
  p_test : process
  begin
    a    <= a;
    a_i  <= 5 + 7;
    a    <= 5 - a;
    b    <= (and a) & a;
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
    a    <= (0          => '0', 1 => '1');
    a    <= (0          => '0', others => '1');
    a    <= ("10");
    a_i  <= + ((((((a_i + 2))))));
    a    <= a sll 2 + 3 * 32;
    a    <= a(to_integer(a * 2) - 3 downto 0 * 3);
    a    <= to_unsigned(a_i, 2);
    a    <= unsigned(std_ulogic_vector(a));
    a(0) <= xnor a;
    a    <= unsigned'(1 => '0', 0 => 'X');
    a_i  <= a'length;

  end process;
end arch;
