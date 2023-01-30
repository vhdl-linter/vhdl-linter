library ieee;
use ieee.std_logic_1164.all;

entity test_selected_name is
end entity;

architecture rtl of test_selected_name is
  type t is record
    apple  : std_ulogic;
    banana : std_ulogic;
  end record;

  signal s : t;
begin

  s.banana <= s.apple;

end architecture;
