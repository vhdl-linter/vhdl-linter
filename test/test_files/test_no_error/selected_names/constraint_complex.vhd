library ieee;
use ieee.std_logic_1164.all;

use work.pkg_complex1.all;

entity array_subtype_record is
end entity;
architecture rtl of array_subtype_record is

  subtype constrained is rec1(
    elem0(1 downto 0),
    elem1(
      elem2(1 downto 0),
      recursive(
        elem3(1 downto 0), 
        elem4(1 downto 0)
      )
    )
  );
  type constrArr is array (0 to 1) of constrained;

  signal c: constrained;
  signal s: constrArr;
begin 
  s(0).elem0 <= c.elem1.elem2; 
  c.elem1.recursive.elem3 <= s(1).elem1.recursive.elem3;
end architecture;