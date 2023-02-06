library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity test_completion_record is

end test_completion_record;

architecture arch of test_completion_record is
  type rec2 is record
    banane : integer;
  end record;
  type rec is record
  foo : integer;
  end record;
  signal a : rec;
  signal b : integer;
begin
 b <= a.  ;

end arch;
