library ieee;
use ieee.std_logic_1164.all;

entity test_selected_name is
end entity;

architecture rtl of test_selected_name is
  type t is record
    apple  : std_ulogic;
    banana : std_ulogic;
  end record;

  type t_array1 is array (0 to 1) of t;
  type t_array2 is array (0 to 1) of t_array1;
  signal s1 : t_array1;
  signal s2 : t_array2;
begin

  s1(1).banana <= s2(0)(0).apple;

end architecture;
