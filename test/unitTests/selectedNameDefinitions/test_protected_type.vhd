library ieee;
use ieee.std_logic_1164.all;

entity test_selected_name is
end entity;

architecture rtl of test_selected_name is
  type t is protected
    procedure apple(i: integer);
    function banana return integer;
  end protected;
  type t2 is protected
    procedure kiwi(i: integer);
    function orange return integer;
  end protected;

  signal s : t;
begin

  s.apple(s.banana);
  s.kiwi(s.orange);

end architecture;
