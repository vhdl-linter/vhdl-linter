library ieee;
use ieee.std_logic_1164.all;

entity default_type_signal is
end entity; 

architecture test of default_type_signal is
  signal s: std_logic; -- expect info to use std_ulogic
begin

s <= s;

end architecture;