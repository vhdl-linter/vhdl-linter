library ieee;
use ieee.std_logic_1164.all;
use work.test_pkg.all;
entity test_instantiation is

end entity;
architecture arch of test_instantiation is
  signal a : std_ulogic;
  signal b : std_ulogic;
begin
  inst_test : entity work.test
    generic map(
      TEST_GENERIC => 5
      )
    port map (
      a_in  => a,
      b_out => b
      );
  label1 : test_procedure(5);

end architecture;
