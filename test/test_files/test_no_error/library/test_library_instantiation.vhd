library test_library;

entity test2 is
end entity;

architecture arch of test2 is


begin
  inst_test : entity test_library.test;

end;
