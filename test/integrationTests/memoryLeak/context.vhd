package pkg is
constant TEST_CONSTANT : integer := 5;
end package;
context contextA is
  library testing;
  use testing.pkg.all;
end context;
