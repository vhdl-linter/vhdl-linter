library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity test_completion_record is

end test_completion_record;

architecture arch of test_completion_record is
  type rec2 is record
    banana : integer;
  end record;
  type rec is record
    foo : rec2;
  end record;
  signal a : rec;
  signal b : integer;
begin
  b <= a.;
  b <= a.f;
  b <= a.foo.;
  b <= a.foo.b;

end arch;
