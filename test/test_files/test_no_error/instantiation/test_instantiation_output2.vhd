library ieee;
use ieee.numeric_std.all;

entity test_instantiation_output_dummy2 is
  port (
    test  : out integer;
    test2 : out integer
    );
end entity;

library ieee;
use ieee.std_logic_1164.all;
entity test_instantiation_output2 is
end entity;
architecture arch of test_instantiation_output2 is
  signal test_unused : std_ulogic_vector(7 downto 0);
begin
  inst_test_instantiation_output_dummy : entity work.test_instantiation_output_dummy
    port map(test => test_unused);

end architecture;
