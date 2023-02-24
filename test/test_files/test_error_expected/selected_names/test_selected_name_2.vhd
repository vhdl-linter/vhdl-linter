library ieee;
use ieee.std_logic_1164.all;

entity test_selected_name is
end entity;

architecture rtl of test_selected_name is

  type t1 is record
    banana : std_ulogic;
  end record;

  signal s1 : t1; -- vhdl-linter-disable-line unused
begin

  s1.banana <= s1.banana.does_not_exist.no_additional_error; -- expect only one error for `does_not_exist`

end architecture;
