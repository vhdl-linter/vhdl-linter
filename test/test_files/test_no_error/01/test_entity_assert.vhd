entity test is
  port (
    );
begin
  assert true report "Failure";
end test;

architecture arch of test is
begin
end arch;
