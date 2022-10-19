library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity test_record is
end test_record;

architecture arch of test_record is
  type test_record is record
    test_child : std_logic;
  end record t_TO_FIFO;
  signal test : test_record;
begin
  test.test_child <= test.test_child;
end architecture;
