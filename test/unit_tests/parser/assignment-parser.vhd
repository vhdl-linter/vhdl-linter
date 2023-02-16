-- vhdl-linter-disable unused
library ieee;
use ieee.std_logic_1164.all;
entity ent is
end entity;
architecture arch of ent is
  signal a : std_ulogic;
  signal b : std_ulogic;
begin
  a <= 5
  label : process
  begin
    a <= 5
    if true then
      a <= 5
    end if;
      a <= 5
    for i in 0 to 5 loop
      a <= 5
    end loop;
      a <= 5
    case true is
    when true =>
      a <= 5
    when others =>
      a <= 5
    end case;
    while true loop
      a <= 5
    end loop;
  end process;
  b <= 23
end architecture;
