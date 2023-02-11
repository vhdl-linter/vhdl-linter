library ieee;
use ieee.std_logic_1164.all;

entity test_selected_name is
end entity;

architecture rtl of test_selected_name is
  type t is protected
    procedure apple(i: integer);
    function banana return integer;
  end protected;

  signal s : t;
begin

  s.apple(s.banana);

end architecture;
