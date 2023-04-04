entity test_instantiation_output_dummy is
  port (
    test : out integer
    );
end entity;

entity test_instantiation_output is
end entity;
architecture arch of test_instantiation_output is
begin
  inst_test_instantiation_output_dummy : entity work.test_instantiation_output_dummy;

end architecture;
