-- test upper case test_library
--! @library TEST_LIBRARY

library test_library;

entity test2 is
end entity;

architecture arch of test2 is


begin
  inst_test : entity work.test;

end;
