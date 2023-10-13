library ieee;
use ieee.std_logic_1164.all;
entity ctrl is
end ctrl;
architecture rtl of ctrl is
signal output : std_logic;
begin -- rtl
p_adc : process
variable v : integer;
begin
case (v) is
when 19 => output <= '0';
when others => output <= '1';
end case;
end process p_adc;
end architecture rtl;