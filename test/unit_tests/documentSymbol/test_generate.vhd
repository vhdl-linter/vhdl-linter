library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity test_else_generate is
  port (
    i_clk : in std_ulogic
    );
end test_else_generate;

architecture arch of test_else_generate is
  signal x : integer;
begin
  p_gen : if true generate
    p_reg : process(i_clk)
    begin
      if rising_edge(i_clk) then
        x <= x;
      end if;
    end process;
  else generate
  end generate p_gen;

  p_gen2 : if true generate
  elsif false generate

  end generate p_gen2;
end arch;
