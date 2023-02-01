library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;
use work.test_pkg2.all;

entity test_entity2 is

end test_entity2;

architecture arch of test_entity2 is
  signal a : boolean := func;
begin
  identifier : process
  begin
    report boolean'image(func);
    func(5);
  end process;  -- identifier
end architecture;
