library ieee ;
  use ieee.std_logic_1164.all ;
  use ieee.numeric_std.all ;

entity test_allocator is
end test_allocator ;

architecture arch of test_allocator is
    type IntegerArrayType is array (integer range <>) of Integer ;
    type IntegerArrayPointerType is access IntegerArrayType ;

begin
  identifier : process
    variable PopCountVar     : IntegerArrayPointerType := new IntegerArrayType'(1 => 0) ; -- vhdl-linter-disable-line unused
  variable Min, Max : integer; -- vhdl-linter-disable-line unused
  begin
        PopCountVar := new IntegerArrayType'(Min to Max => 0) ;

  end process ; -- identifier
end architecture ;