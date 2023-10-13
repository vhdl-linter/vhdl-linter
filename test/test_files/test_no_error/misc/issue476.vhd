library ieee;
use ieee.std_logic_1164.all;

entity issue476 is
end issue476;

architecture rtl of issue476 is
  signal apple : std_ulogic;
begin
  p_adc : process
    constant V : integer := 1;
  begin
    case (V) is 
      when 19     => apple <= apple;
      when others => apple <= apple;
    end case;
  end process p_adc;
end architecture rtl;
