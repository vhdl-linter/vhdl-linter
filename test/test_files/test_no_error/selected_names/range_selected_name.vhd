library ieee;
use ieee.std_logic_1164.all;
entity range_selected_name is
end entity;
architecture rtl of range_selected_name is
  type test is record
    element: std_ulogic_vector(1 downto 0);
  end record;
  signal rec: test;
  signal s: std_ulogic_vector(rec.element'range);
begin
  rec.element <= s;
  s <= rec.element;
end architecture; 