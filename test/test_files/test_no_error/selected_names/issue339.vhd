library ieee;
use ieee.std_logic_1164.all;
entity array_subtype_record is
end entity;

architecture rtl of array_subtype_record is
  type rec is record
    element: std_ulogic_vector;
  end record;
  subtype constrained is rec(element(1 downto 0));
  type constrArr is array (0 to 1) of constrained;

  signal c: constrained;
  signal s: constrArr;
begin
  s(0).element <= c.element;
  c.element <= s(1).element;
end architecture;