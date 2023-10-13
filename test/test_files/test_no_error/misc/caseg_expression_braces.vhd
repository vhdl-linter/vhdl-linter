library ieee;
use ieee.std_logic_1164.all;

entity caseg_expression_braces is
end caseg_expression_braces;

architecture rtl of caseg_expression_braces is
  signal apple : std_ulogic;
  constant V    : integer := 1;
begin
  lab : case ((((V)))) generate
    when 19     => apple <= apple;
    when others => apple <= apple;
  end generate;
end architecture rtl;
