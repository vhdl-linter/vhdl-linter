library ieee;
use ieee.std_logic_1164.all;
entity test_with is
end entity;
architecture arch of test_with is

	signal a : std_ulogic_vector(2 - 1 downto 0);
	signal b : std_ulogic_vector(4 - 1 downto 0);
begin


	process is
	begin
		a <= "00";
		with a select b <=
			"1000" when "00",
			"0100" when "01",
			"0010" when "10",
			"0001" when "11",
			"0001" when others;
			report to_string(b);
	end process;

end architecture;
