library ieee;
use ieee.std_logic_1164.all;
entity multi_level_constraint is
end entity;
architecture rtl of multi_level_constraint is
  type sub is record
    elem: std_ulogic_vector;
  end record;

  type parent is record
    apple: sub;
    peach: sub;
  end record;

  signal s_unused: parent(apple(elem(1 downto 0)), peach(elem(1 downto 0)));
begin
end architecture;