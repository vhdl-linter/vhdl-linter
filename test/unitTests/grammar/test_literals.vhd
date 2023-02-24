library ieee;
use ieee.std_logic_1164.all;
entity test_literals is

end entity;
architecture arch of test_literals is
  signal b : std_ulogic        := 5;
  signal c : std_ulogic_vector := x"DEADBEEF";
  signal d : std_ulogic_vector := "01010101";
  signal e : string            := "Hello world!";
  signal f : integer_vector := (
    123_456,
    1E6,
    2#1111_1111#,
    16#FF#,
    16#E#E1
    );
  signal g : real_vector := (
    12.0, 0.0, 0.456, 3.14159_26,
    1.34E-12, 1.0E+6, 6.023E+24,
    16#F.FF#E+2
    );
    /* Multi
    line
    comment */
begin

end architecture;
