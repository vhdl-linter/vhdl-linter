-- vhdl-linter-disable port-declaration
package test_pkg is
  constant test_constant : integer := 5;
end package;
---------


use work.all;
entity test_use_clause is
  port (
    test_input : integer_vector(test_pkg.test_constant - 1 downto 0)
    -- test_input2 : integer_vector(test_constant - 1 downto 0)
    );
end test_use_clause;