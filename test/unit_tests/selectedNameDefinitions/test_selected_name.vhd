library ieee;
use ieee.std_logic_1164.all;

entity test_selected_name is
end entity;

architecture rtl of test_selected_name is
  type t is record
    apple  : apple;
    banana : banana;
  end record;

  signal s : t;
begin

  s.banana <= s.apple;

end architecture;
