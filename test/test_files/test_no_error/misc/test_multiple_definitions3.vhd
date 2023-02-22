library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;


entity test_multiple_definitions3 is
end test_multiple_definitions3;

architecture arch of test_multiple_definitions3 is
begin
  -- multiple definitions should check for the label and not the entity name
  inst0 : entity work.test_entity_arch_identifier;
  inst1 : entity work.test_entity_arch_identifier;
end architecture;
