library ieee;
use ieee.std_logic_1164.all;
entity array_subtype_record is
end entity;

architecture rtl of array_subtype_record is
  type rec0 is record
    element: std_ulogic_vector;
  end record;
  type rec1 is record
    element0: std_ulogic_vector;
    element1: std_ulogic_vector;
    element_rec: rec0;
  end record;
  subtype constrained is rec1(element0(1 downto 0), element1(1 downto 0), element_rec(element(1 downto 0)));
  type constrArr is array (0 to 1) of constrained;

  signal c: constrained;
  signal s: constrArr;
begin
  s(0).element0 <= c.element1;
  c.element_rec.element <= s(1).element0;
end architecture;