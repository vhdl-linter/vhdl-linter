library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity test_else_generate is
end test_else_generate;

architecture arch of test_else_generate is
  signal state: std_ulogic_vector(1 downto 0) := (others => '0');
  constant idle : std_ulogic_vector(state'range) := (others => '0');
begin

  p_reg : process(all)
  begin
    case state is
      when idle =>
        state <= (others => '1');
      when x"1" =>
        state <= (others => '0');
      when "10" =>
        state <= idle;
      when others =>
        state <= "10";
    end case;
  end process;

end arch;
