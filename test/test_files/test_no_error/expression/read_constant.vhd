library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity read_constant is
end entity;
architecture arch of read_constant is
  signal s : std_ulogic_vector(8 - 1 downto 0);
begin
  proc : process(all)
  begin
    for i in s'range loop
      -- i in lhs is read and not written
      s((i))         <= '0';            -- simplified test case
      s((i + 0) * 1) <= s(0);           -- original test case
    end loop;
  end process;
end architecture;
