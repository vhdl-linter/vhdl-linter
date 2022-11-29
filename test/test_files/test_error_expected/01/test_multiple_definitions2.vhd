library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;
entity dummy_entity is
end entity;
entity dummy_entity2 is
end entity;

entity test_multiple_definitions2 is
end test_multiple_definitions2;

architecture arch of test_multiple_definitions2 is
begin
  -- multiple definitions should check for the label
  inst0 : entity work.dummy_entity;
  -- Remove second error
  inst0 : entity work.dummy_entity2; -- vhdl-linter-disable-line multiple-definition
end architecture;
