library ieee;
use ieee.std_logic_1164.all;

entity test_selected_name is
end entity;

architecture rtl of test_selected_name is
  type t1 is record
    apple  : std_ulogic;
  end record;

  type t_array is array (0 to 1) of t1;

  type t2 is record
    banana : t_array;
  end record;

  signal s1 : t1; -- vhdl-linter-disable-line unused
  signal s2 : t2; -- vhdl-linter-disable-line unused
begin

  s1.apple <= s2.banana(0).apple;

end architecture;
